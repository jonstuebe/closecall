import { MAX_TRIES } from '../lib/guessing';
import { ResultMark } from './Icons';
import { Modal } from './Modal';

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="How to play" open={open} onClose={onClose}>
      <p>Every day there’s a new mystery animal, photographed way too close.</p>
      <ul className="rules">
        <li>You get {MAX_TRIES} tries to name it.</li>
        <li>Each wrong guess zooms the camera out a little.</li>
        <li>Stuck? Zoom out without guessing — but it still uses a try.</li>
      </ul>
      <div className="key">
        <span>
          <ResultMark result="hit" />
          Got it
        </span>
        <span>
          <ResultMark result="miss" />
          Wrong guess
        </span>
        <span>
          <ResultMark result="skip" />
          Zoomed out
        </span>
      </div>
      <p className="modal-footnote">Everyone gets the same animal each day. Come back tomorrow for the next one.</p>
      <button className="button button-primary" type="button" onClick={onClose} data-autofocus>
        Start playing
      </button>
    </Modal>
  );
}
