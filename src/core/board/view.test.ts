import { fitSize, toWorld, zoomAt } from './view';

describe('board view', () => {
  it('keeps the point under the cursor fixed while zooming', () => {
    const v = { x: 100, y: 50, zoom: 1 };
    const before = toWorld(200, 120, v);
    const after = toWorld(200, 120, zoomAt(v, 2, 200, 120));
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAt(v, 100, 0, 0).zoom).toBe(4);
  });

  it('fits big images and leaves small ones alone', () => {
    expect(fitSize(4000, 2000, 1600)).toEqual({ w: 1600, h: 800 });
    expect(fitSize(300, 200, 1600)).toEqual({ w: 300, h: 200 });
  });
});
