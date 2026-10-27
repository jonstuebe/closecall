# Close Call

A daily guessing game: every player gets the same photo of an animal, shot far too close, and has six tries to name it.

## Language

**Puzzle**:
The single daily challenge every player shares: one Photo, the animal it shows, and the Zoom ladder it is revealed by.
_Avoid_: Round, level, daily

**Puzzle number**:
The position of a Puzzle counted from the Launch date, where the Launch date's Puzzle is #1.
_Avoid_: Day number, puzzle id

**Launch date**:
The local calendar date on which Puzzle #1 is played.

**Try**:
One of the six chances to name the animal. A guess and a deliberate zoom-out each cost exactly one.
_Avoid_: Guess (a Try need not be a guess), attempt, turn

**Zoom ladder**:
A Puzzle's six zoom factors, one per Try, shrinking to 1 — the whole Photo — on the last.
_Avoid_: Levels, stages

**Focus**:
The point of a Photo the Viewfinder stays pinned to as it zooms out, as a fraction of the Photo's width and height.
_Avoid_: Centre, crop, anchor

**Viewfinder**:
The square camera frame the Photo is seen through.
_Avoid_: Canvas, image area

**Photo**:
The image a Puzzle is built from, stored under a content-hashed filename so nothing about it can be guessed in advance.

**Fact**:
The "Did you know?" line attached to a Puzzle, shown on the reveal and never shared.
_Avoid_: Trivia, tidbit
