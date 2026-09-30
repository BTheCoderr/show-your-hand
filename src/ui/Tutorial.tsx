import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

type Special = {
  id: string
  image: string
  name: string
  description: string
}

const SPECIALS: Special[] = [
  {
    id: 'show',
    image: '/cards/show-your-hand.png',
    name: 'Show Your Hand',
    description: 'Choose a player. Their hand is revealed until the current turn ends.',
  },
  {
    id: 'drop',
    image: '/cards/drop-color.png',
    name: 'Drop Color',
    description: 'Choose a color. The target drops every numbered card they hold in that color, then you may claim dropped cards.',
  },
  {
    id: 'skip',
    image: '/cards/skip.png',
    name: 'Skip',
    description: 'Skip the next player unless the attack is successfully defended.',
  },
  {
    id: 'shuffle',
    image: '/cards/shuffle.png',
    name: 'Shuffle',
    description: 'Choose one or two opponents. Affected hands go back into the deck and are re-dealt.',
  },
]

const SCORE_ROWS = [
  ['Mixed numbered 1–5', '1 point'],
  ['Five of the same number', '2 points'],
  ['Five of the same color', '3 points'],
  ['Same-color 1–5', '4 points'],
]

export function tutorialCanContinue(step: number, practiceDone: boolean): boolean {
  return step === 0 || step === 7 || practiceDone
}

export function Tutorial({ open, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [practiceDone, setPracticeDone] = useState(false)
  const [selectedSpecial, setSelectedSpecial] = useState<string | null>(null)
  const [shuffleTargets, setShuffleTargets] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setStep(0)
    setPracticeDone(false)
    setSelectedSpecial(null)
    setShuffleTargets([])
  }, [open])

  useEffect(() => {
    setPracticeDone(step === 0 || step === 7)
    setSelectedSpecial(null)
    setShuffleTargets([])
  }, [step])

  const selectedSpecialInfo = useMemo(
    () => SPECIALS.find((special) => special.id === selectedSpecial) ?? null,
    [selectedSpecial],
  )

  if (!open) return null

  const canContinue = tutorialCanContinue(step, practiceDone)

  const next = () => {
    if (step >= 7) {
      onClose()
      return
    }
    setStep((current) => Math.min(7, current + 1))
  }

  const previous = () => setStep((current) => Math.max(0, current - 1))

  return (
    <div
      className="syh-modal syh-tutorial-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <section className="syh-tutorial">
        <header className="syh-tutorial-header">
          <div>
            <p className="syh-kicker">2-minute tutorial</p>
            <h2 id="tutorial-title">HOW TO PLAY</h2>
          </div>
          <button type="button" className="syh-text-btn" onClick={onClose}>
            Skip tutorial
          </button>
        </header>

        <div className="syh-tutorial-progress" aria-label={`Tutorial step ${step + 1} of 8`}>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className={index <= step ? 'is-on' : ''} />
          ))}
        </div>

        {step === 0 ? (
          <TutorialStep
            eyebrow="The goal"
            title="Build a scoring five-card hand"
            copy="You always work toward five cards that score. First player to 5 total points wins the match."
          >
            <div className="syh-tutorial-loop" aria-label="Turn order">
              <b>DROP</b>
              <span>→</span>
              <b>RESOLVE</b>
              <span>→</span>
              <b>PICK UP</b>
            </div>
            <p className="syh-tutorial-tip">
              Number cards build scoring hands. Special cards attack, disrupt, or defend.
            </p>
          </TutorialStep>
        ) : null}

        {step === 1 ? (
          <TutorialStep
            eyebrow="1 · Drop"
            title="Play one card from your hand"
            copy="On your turn, drop a card first. Swipe a card upward in the real game. Try it here by tapping the highlighted card."
          >
            <div className="syh-tutorial-hand">
              {['green-1', 'orange-3', 'blue-5', 'purple-2', 'green-4'].map((id) => {
                const target = id === 'orange-3'
                return (
                  <button
                    key={id}
                    type="button"
                    className={`syh-tutorial-card ${target ? 'is-practice' : ''} ${practiceDone && target ? 'is-played' : ''}`}
                    onClick={() => target && setPracticeDone(true)}
                    aria-label={target ? 'Practice playing orange 3' : id.replace('-', ' ')}
                  >
                    <img src={`/cards/${id}.png`} alt={id.replace('-', ' ')} />
                  </button>
                )
              })}
            </div>
            <p className={`syh-tutorial-check ${practiceDone ? 'is-done' : ''}`}>
              {practiceDone ? '✓ Nice — card played.' : 'Tap the glowing Orange 3.'}
            </p>
          </TutorialStep>
        ) : null}

        {step === 2 ? (
          <TutorialStep
            eyebrow="2 · Pick up"
            title="Finish the turn back at five cards"
            copy="After the card or attack resolves, pick up. You can draw from the deck, or when eligible, take the previous numbered discard."
          >
            <div className="syh-tutorial-pickups">
              <button
                type="button"
                className={`syh-tutorial-pick ${practiceDone ? 'is-done' : ''}`}
                onClick={() => setPracticeDone(true)}
              >
                <img src="/cards/back.png" alt="Draw pile" />
                <b>Draw pile</b>
                <span>Take the next card</span>
              </button>
              <span className="syh-tutorial-or">OR</span>
              <button
                type="button"
                className={`syh-tutorial-pick ${practiceDone ? 'is-done' : ''}`}
                onClick={() => setPracticeDone(true)}
              >
                <img src="/cards/blue-4.png" alt="Blue 4 discard" />
                <b>Numbered discard</b>
                <span>Take it when eligible</span>
              </button>
            </div>
            <p className={`syh-tutorial-check ${practiceDone ? 'is-done' : ''}`}>
              {practiceDone ? '✓ Pickup selected.' : 'Tap either pickup option.'}
            </p>
          </TutorialStep>
        ) : null}

        {step === 3 ? (
          <TutorialStep
            eyebrow="3 · Attack"
            title="Special cards change the table"
            copy="A special card is your drop for the turn. Tap any special below to see what it does."
          >
            <div className="syh-tutorial-specials">
              {SPECIALS.map((special) => (
                <button
                  key={special.id}
                  type="button"
                  className={`syh-tutorial-special ${selectedSpecial === special.id ? 'is-on' : ''}`}
                  onClick={() => {
                    setSelectedSpecial(special.id)
                    setPracticeDone(true)
                  }}
                >
                  <img src={special.image} alt={special.name} />
                  <span>{special.name}</span>
                </button>
              ))}
            </div>
            <div className="syh-tutorial-explainer" aria-live="polite">
              {selectedSpecialInfo ? (
                <>
                  <b>{selectedSpecialInfo.name}</b>
                  <span>{selectedSpecialInfo.description}</span>
                </>
              ) : (
                <span>Choose a special card to inspect it.</span>
              )}
            </div>
          </TutorialStep>
        ) : null}

        {step === 4 ? (
          <TutorialStep
            eyebrow="4 · Defend"
            title="Blank cancels an attack"
            copy="When an attack targets you, a Blank can cancel it. Matching special cards can also counter supported attacks. Blank cancels — it does not reverse."
          >
            <button
              type="button"
              className={`syh-tutorial-defense ${practiceDone ? 'is-done' : ''}`}
              onClick={() => setPracticeDone(true)}
            >
              <img src="/cards/blank.png" alt="Blank card" />
              <span>{practiceDone ? 'Attack blocked ✓' : 'Tap Blank to defend'}</span>
            </button>
          </TutorialStep>
        ) : null}

        {step === 5 ? (
          <TutorialStep
            eyebrow="5 · Shuffle"
            title="Choose one or two opponents"
            copy="Shuffle can target one or two players. Select up to two practice targets, then confirm."
          >
            <div className="syh-tutorial-targets">
              {['CPU 1', 'CPU 2', 'CPU 3'].map((name) => {
                const selected = shuffleTargets.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    className={selected ? 'is-on' : ''}
                    onClick={() =>
                      setShuffleTargets((current) => {
                        if (current.includes(name)) return current.filter((item) => item !== name)
                        if (current.length >= 2) return current
                        return [...current, name]
                      })
                    }
                  >
                    <span className="syh-tutorial-cardbacks">
                      <img src="/cards/back.png" alt="" />
                      <img src="/cards/back.png" alt="" />
                      <img src="/cards/back.png" alt="" />
                    </span>
                    {name}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="syh-primary"
              disabled={shuffleTargets.length === 0}
              onClick={() => setPracticeDone(true)}
            >
              {practiceDone ? 'Shuffle confirmed ✓' : `Confirm Shuffle (${shuffleTargets.length})`}
            </button>
          </TutorialStep>
        ) : null}

        {step === 6 ? (
          <TutorialStep
            eyebrow="6 · Declare"
            title="Know when your five cards score"
            copy="When you have a scoring five-card hand, declare it. Higher combinations award more points, and the first player to 5 total points wins."
          >
            <div className="syh-tutorial-score-example">
              {[1, 2, 3, 4, 5].map((number) => (
                <img key={number} src={`/cards/green-${number}.png`} alt={`Green ${number}`} />
              ))}
            </div>
            <div className="syh-tutorial-score-grid">
              {SCORE_ROWS.map(([hand, points]) => (
                <div key={hand}>
                  <span>{hand}</span>
                  <b>{points}</b>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="syh-primary"
              onClick={() => setPracticeDone(true)}
            >
              {practiceDone ? 'Declared ✓' : 'Declare this hand'}
            </button>
          </TutorialStep>
        ) : null}

        {step === 7 ? (
          <TutorialStep
            eyebrow="You are ready"
            title="Drop. Resolve. Pick up."
            copy="Watch the active-player glow, follow the move banners, build your hand, and attack when it helps. You can replay this tutorial from the top menu at any time."
          >
            <div className="syh-tutorial-ready">
              <img src="/cards/show-your-hand.png" alt="Show Your Hand card" />
              <div>
                <b>First to 5 points wins.</b>
                <span>But never show your hand unless somebody makes you.</span>
              </div>
            </div>
          </TutorialStep>
        ) : null}

        <footer className="syh-tutorial-actions">
          <button
            type="button"
            className="syh-secondary"
            onClick={previous}
            disabled={step === 0}
          >
            Back
          </button>
          <span>{step + 1} / 8</span>
          <div className="syh-tutorial-next-wrap">
            {!canContinue ? (
              <span className="syh-tutorial-requirement">Try the highlighted action first — or skip this step.</span>
            ) : null}
            <button
              type="button"
              className="syh-primary syh-tutorial-next"
              onClick={next}
              aria-describedby={!canContinue ? 'tutorial-step-help' : undefined}
            >
              {step === 7 ? 'Finish tutorial' : canContinue ? 'Next' : 'Skip step'}
            </button>
            {!canContinue ? (
              <span id="tutorial-step-help" className="sr-only">
                The practice action is optional. This button skips to the next tutorial step.
              </span>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  )
}

function TutorialStep({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string
  title: string
  copy: string
  children: ReactNode
}) {
  return (
    <div className="syh-tutorial-step">
      <p className="syh-kicker">{eyebrow}</p>
      <h3>{title}</h3>
      <p className="syh-tutorial-copy">{copy}</p>
      <div className="syh-tutorial-stage">{children}</div>
    </div>
  )
}
