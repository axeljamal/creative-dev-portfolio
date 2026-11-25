// The game's few sounds, played on Dua Pulau's own instruments (the kettles, the gong, the kolintang's bars and the
// drum) over its sea: the countdown, the gun, a mark rounded, the finish, a knock. Nothing sounds until start() has
// run inside a key press or tap, as browsers require.
import * as audio from "../dua-pulau/world/audio";

export const sfx = {
  /** inside the first key or tap: lets the browser play sound from now on */
  start: () => audio.startAudio(),
  mute: (m: boolean) => audio.setMuted(m),
  /** the tab is hidden: fall silent, and come back with it */
  away: (a: boolean) => audio.setAway(a),
  /** three, two, one */
  tick: () => void audio.kettle(4, 0.34),
  gun: () => {
    audio.gong(0.6);
    audio.kettle(0, 0.3, 0.06);
  },
  /** the i-th mark rounded (from 0): a wooden bar, one step up the scale each mark */
  mark: (i: number) => void audio.bar(i + 1, 0.42),
  finish: () => [0, 2, 3, 5].forEach((n, i) => audio.bar(n, 0.42, i * 0.11)),
  bump: () => void audio.bump(),
  /** every frame: the sea runs louder and brighter the faster she sails (0…1) */
  sea: (speed: number) => audio.ambience(speed, 0, 1),
};
