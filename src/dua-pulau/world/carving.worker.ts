// Bakes the gate's carved stone away from the page, so the world keeps moving while it is cut.
import { bakeGateStone } from "./carving";

self.onmessage = (e: MessageEvent<number>) => {
  const out = bakeGateStone(e.data);
  (self as unknown as Worker).postMessage(out, Object.values(out).flatMap((b) => [b.col.buffer, b.nor.buffer]));
};
