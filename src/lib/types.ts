/** A photo as the Worker hands it to the client. */
export interface Photo {
  /** Content-hashed filename under `/photos/`; never guessable from the page. */
  file: string;
  width: number;
  height: number;
  /** Shown once the animal is revealed. */
  credit: string;
}

/** Where the viewfinder stays pinned as it zooms, as a 0..1 fraction of the photo. */
export interface Focus {
  x: number;
  y: number;
}

export interface Puzzle {
  id: number;
  /** Canonical answer, lowercase: "raccoon". */
  answer: string;
  /** The answer in a sentence: "a raccoon". */
  display: string;
  /** Normalized guesses counted as correct; always includes `answer`. */
  accept: string[];
  photo: Photo;
  focus: Focus;
  /** One zoom factor per try, descending, ending at 1 (the whole photo). */
  zooms: number[];
  /** The "Did you know?" line shown on reveal. */
  fact?: string;
}

/** What happened on one try. */
export type TryResult = 'hit' | 'miss' | 'skip';
