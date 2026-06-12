/**
 * Static blog content. Posts are plain data (no CMS yet) rendered by
 * app/(marketing)/blog — body text only, so nothing here is executable.
 */
export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string // ISO yyyy-mm-dd
  readMins: number
  tag: string
  sections: { heading?: string; paragraphs: string[] }[]
}

export const POSTS: BlogPost[] = [
  {
    slug: 'body-doubling-why-studying-together-works',
    title: 'Body doubling: why studying next to someone makes your brain behave',
    excerpt:
      'You focus harder when another human is simply present and working. The effect has a name, decades of evidence, and a very practical takeaway.',
    date: '2026-05-28',
    readMins: 5,
    tag: 'Focus science',
    sections: [
      {
        paragraphs: [
          'You already know the feeling. Alone at your desk, a "quick" phone check turns into forty minutes. But in a library full of people quietly working, you somehow stay on task. That isn\'t discipline — it\'s an environment effect, and it has a name: body doubling.',
          'Body doubling means working alongside another person who is also working. They don\'t help you, talk to you, or check on you. Their presence alone changes your behaviour.',
        ],
      },
      {
        heading: 'The mechanics behind it',
        paragraphs: [
          'Psychologists have studied "social facilitation" since the 1890s, when Norman Triplett noticed cyclists ride faster against others than against the clock. The modern picture: the presence of others raises arousal and makes the dominant response stronger. For well-practised tasks — reading, note-taking, problem sets — that means better output.',
          'There\'s also gentle accountability. Leaving mid-session feels like breaking a promise when three people watched you commit to "Calc II, 4–6 PM". Nobody says anything. You stay anyway.',
        ],
      },
      {
        heading: 'How to use it deliberately',
        paragraphs: [
          'Pick sessions with a vibe that matches your task: silent for deep reading, Pomodoro for grinding through problem sets, discussion for exam prep with classmates.',
          'Keep the group small — two to five people is the sweet spot. Big groups drift into socialising; tiny ones keep the contract tight.',
          'Make it recurring. The magic compounds when the same crew expects you every Tuesday. That\'s exactly what StudySpot circles are for.',
        ],
      },
    ],
  },
  {
    slug: 'pomodoro-for-group-study',
    title: 'The Pomodoro technique works better in a group — here\'s how to run one',
    excerpt:
      'Synced 25-minute sprints with shared breaks turn a study group from a distraction risk into a focus machine. A practical playbook.',
    date: '2026-05-14',
    readMins: 4,
    tag: 'Playbook',
    sections: [
      {
        paragraphs: [
          'The Pomodoro technique — 25 minutes of work, 5 minutes of break — is the most famous focus method on the internet. It\'s also famously easy to abandon when you\'re alone and nobody sees you skip the timer.',
          'Run it as a group and the dynamic flips: the timer becomes a shared contract. Nobody scrolls during a sprint, because nobody else is scrolling. Breaks become actual social time instead of guilt.',
        ],
      },
      {
        heading: 'The group playbook',
        paragraphs: [
          'One person owns the timer — in StudySpot online rooms, the host\'s focus timer is synced to everyone automatically.',
          'Agree the sprint plan up front: how many rounds, and what each person is working on. Saying your goal out loud ("this sprint I\'m finishing question 4") is half the trick.',
          'Protect the silence. During a sprint, chat is for emergencies. Save questions for the break — write them down so they don\'t occupy your head.',
          'Use breaks properly: stand up, get water, compare progress. Then start the next round on time. The restart discipline is what separates groups that finish from groups that fizzle.',
        ],
      },
      {
        heading: 'When not to use it',
        paragraphs: [
          'Pomodoro suits grinding: problem sets, flashcards, drafting. For genuinely collaborative work — whiteboarding a proof, group projects — pick a discussion vibe instead and let the conversation flow. The technique is a tool, not a religion.',
        ],
      },
    ],
  },
  {
    slug: 'find-a-study-crew-that-sticks',
    title: 'How to find a study crew that actually sticks',
    excerpt:
      'Most study groups die within two weeks. The ones that survive share three boring, copyable habits.',
    date: '2026-04-30',
    readMins: 4,
    tag: 'Community',
    sections: [
      {
        paragraphs: [
          'Every semester starts the same way: a burst of "let\'s study together!" energy, a group chat, one good session… then silence. The group didn\'t fail because people stopped caring. It failed because it ran on motivation, and motivation is a terrible scheduler.',
        ],
      },
      {
        heading: 'Habit one: a fixed slot',
        paragraphs: [
          'Groups that last don\'t re-negotiate the time every week — that\'s a coordination tax someone always fails to pay. Pick a slot ("Tuesdays 5 PM, library, third floor") and let it run. Missing one is fine; the slot survives.',
        ],
      },
      {
        heading: 'Habit two: low-stakes membership',
        paragraphs: [
          'The crew shouldn\'t collapse when one person bails. Keep the circle a bit bigger than the table — five to eight people for a four-seat session. StudySpot\'s spots system handles this naturally: post the session, first to claim the spots is in, everyone else catches the next one.',
        ],
      },
      {
        heading: 'Habit three: a visible record',
        paragraphs: [
          'Streaks, verified hours, session history — a visible record turns "we sometimes study" into an identity: "we\'re the Tuesday crew, 9 weeks running". Identity is what survives exam season, holidays, and bad weeks.',
          'Find people on the same material as you, set the slot, and let the system do the remembering. That\'s the whole secret.',
        ],
      },
    ],
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug)
}
