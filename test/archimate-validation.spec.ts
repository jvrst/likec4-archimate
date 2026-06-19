import { test } from 'vitest'
import { likec4model } from './likec4-model'

// ── Element kind groups per ArchiMate 4 ─────────────────────────────────────
//
// v4 merged the behavior elements (service, process, function, event) into a
// single generic set, and made role/collaboration/path generic. Element kind
// therefore no longer encodes a layer, so these rules are expressed in terms of
// ArchiMate *aspects* (active / behavior / passive structure) rather than the
// per-layer kinds used for 3.1.

const motivation = [
  'stakeholder', 'driver', 'assessment', 'goal', 'outcome',
  'principle', 'requirement', 'meaning', 'value',
]

const strategy = ['resource', 'capability', 'valueStream', 'courseOfAction']

// Generic (Common Domain) behavior elements.
const behavior = ['process', 'function', 'service', 'event']

// Active structure (Common + per-domain structural elements).
const activeStructure = [
  'role', 'collaboration', 'path',
  'businessActor', 'businessInterface',
  'appComponent', 'appInterface',
  'node', 'device', 'systemSoftware', 'techInterface',
  'communicationNetwork', 'equipment', 'facility', 'distributionNetwork',
]

// Passive structure.
const passiveStructure = ['businessObject', 'dataObject', 'artifact', 'material']

// Composite elements (may contain/aggregate other elements across aspects).
const composite = ['grouping', 'location', 'product']

// Implementation & Migration.
const implMigration = ['workPackage', 'deliverable', 'plateau']

const core = [...activeStructure, ...behavior, ...passiveStructure]

// ── Helper ───────────────────────────────────────────────────────────────────

function validPairs(combinations: [string[], string[]][]): Set<string> {
  const pairs = new Set<string>()
  for (const [sources, targets] of combinations) {
    for (const s of sources) for (const t of targets) pairs.add(`${s}→${t}`)
  }
  return pairs
}

// ── Realization ──────────────────────────────────────────────────────────────
// Gives concrete form to a more abstract concept. In v4 the abstract end is a
// service or other behavior, a passive structure element, a motivation element
// (e.g. requirement → goal), or a strategy element.

test('realization: target must be behavior, passive structure, motivation, or strategy', ({ expect }) => {
  const validTargets = [...behavior, ...passiveStructure, ...motivation, ...strategy]

  for (const r of likec4model.relationshipsWhere({ kind: 'realization' })) {
    expect.soft(
      validTargets.includes(r.target.kind),
      `realization "${r.source.id}" → "${r.target.id}": ${r.target.kind} is not a valid ArchiMate realization target`
    ).toBe(true)
  }
})

// ── Assignment ───────────────────────────────────────────────────────────────
// An active structure element is responsible for performing behavior (or hosts
// another structure element); a role may also be assigned to a work package.

test('assignment: active structure → behavior/structure/work package', ({ expect }) => {
  const valid = validPairs([
    [activeStructure, [...behavior, ...activeStructure, ...passiveStructure, ...implMigration]],
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
  const invalidSources = [...passiveStructure, ...motivation]

  for (const r of likec4model.relationshipsWhere({ kind: 'serving' })) {
    expect.soft(
      !invalidSources.includes(r.source.kind),
      `serving "${r.source.id}" → "${r.target.id}": ${r.source.kind} cannot be a serving source`
    ).toBe(true)
  }
})

// ── Access ───────────────────────────────────────────────────────────────────
// A behavior or active structure element reads/writes/uses a passive structure element.

test('access: source must be active/behavior and target must be passive structure', ({ expect }) => {
  const validSources = [...activeStructure, ...behavior]

  for (const r of likec4model.relationshipsWhere({ kind: 'access' })) {
    expect.soft(
      validSources.includes(r.source.kind),
      `access "${r.source.id}" → "${r.target.id}": ${r.source.kind} is not a valid access source`
    ).toBe(true)
    expect.soft(
      passiveStructure.includes(r.target.kind),
      `access "${r.source.id}" → "${r.target.id}": ${r.target.kind} is not passive structure (access target must be passive)`
    ).toBe(true)
  }
})

// ── Triggering ───────────────────────────────────────────────────────────────
// Causal or temporal ordering between behavior elements (events included) or
// active structure elements that emit/receive them.

test('triggering: source and target must be behavior or active structure', ({ expect }) => {
  const valid = [...activeStructure, ...behavior]

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
// Transfer of information, goods, or money between behavior elements (and the
// passive structure elements that are transferred).

test('flow: source and target must be behavior or passive structure', ({ expect }) => {
  const valid = [...behavior, ...passiveStructure]

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
// Structural containment. v4 element kinds no longer encode a layer, so we group
// by aspect: core (active/behavior/passive), motivation, strategy, and
// implementation & migration. Composite elements (grouping, location, product)
// and plateau may aggregate/compose across aspects, so they are unrestricted as
// the source.

const aspects = [core, motivation, strategy, implMigration]
const crossAspectContainers = [...composite, 'plateau']

function aspectOf(kind: string): number {
  return aspects.findIndex(a => a.includes(kind))
}

test('composition: source and target in the same aspect (composite sources unrestricted)', ({ expect }) => {
  for (const r of likec4model.relationshipsWhere({ kind: 'composition' })) {
    if (crossAspectContainers.includes(r.source.kind)) continue
    expect.soft(
      aspectOf(r.source.kind) === aspectOf(r.target.kind),
      `composition "${r.source.id}" → "${r.target.id}": ${r.source.kind} and ${r.target.kind} are in different aspects`
    ).toBe(true)
  }
})

test('aggregation: source and target in the same aspect (composite sources unrestricted)', ({ expect }) => {
  for (const r of likec4model.relationshipsWhere({ kind: 'aggregation' })) {
    if (crossAspectContainers.includes(r.source.kind)) continue
    expect.soft(
      aspectOf(r.source.kind) === aspectOf(r.target.kind),
      `aggregation "${r.source.id}" → "${r.target.id}": ${r.source.kind} and ${r.target.kind} are in different aspects`
    ).toBe(true)
  }
})
